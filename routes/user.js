const express = require('express');
const router = express.Router();
const db = require('../db');


const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};


router.get('/orders/:userID', async (req, res) => {
    const userID = req.params.userID;
    // console.log(userID);

    try {
        const productsQuery = `
            SELECT mo.orderID, product.product_name, SUM(mo.quantity) AS total_quantity
            FROM product
            JOIN my_orders mo ON product.productID = mo.productID
            WHERE mo.orderID IN (
                SELECT o.orderID
                FROM \`order\` o
                WHERE o.userId = ?
            )
            GROUP BY mo.orderID, product.product_name;
            `;
        const products = await query(productsQuery, [userID]);

        // console.log(products);

        const totalQuery = `
            SELECT SUM(o.order_value) AS total, o.orderID
            FROM \`order\` o
            JOIN my_orders mo ON o.orderID = mo.orderID
            WHERE o.userID = ?
            GROUP BY o.orderID;
            `;
        const totalResult = await query(totalQuery, [userID]);

        // console.log(totalResult);

        const delivery_date_query = `
            SELECT delivery_date, orderID
            FROM \`order\`
            WHERE userID = ?
            group by orderID;
            `;

        const delivery_date_result = await query(delivery_date_query, [userID]);

        const response = totalResult.map((order) => {
            const productsInOrder = products.filter((product) => product.orderID === order.orderID);
            const delivery_date = delivery_date_result.filter((date) => date.orderID === order.orderID);
            return {
                orderID: order.orderID,
                total: order.total,
                products: productsInOrder,
                delivery_date: delivery_date
            };
        });

        // console.log(response);

        res.json(response);
    } catch (err) {
        console.log(err);
        res.status(500).send('Database error: ' + err);
    }
});

router.get('/payment/:userID', async (req, res) => {
    const userID = req.params.userID;

    try {
        const paymentQuery = `
            SELECT DISTINCT \`order\`.orderID, payments.payment_mode, payments.payment_address 
            FROM payments 
            JOIN \`order\` ON payments.paymentID = \`order\`.paymentID 
            JOIN my_orders ON \`order\`.orderID = my_orders.orderID
            WHERE \`order\`.userID=?;`
        const results = await query(paymentQuery, [userID]);

        res.json(results);
    } catch (err) {
        res.status(500).send('Database error: ' + err);
    }
});

router.get('/cart/:userID', async (req, res) => {
    const userID = req.params.userID;

    try {
        const productsQuery = `
            SELECT cart.productID, product_name, cart.quantity 
            FROM product 
            JOIN cart ON product.productID = cart.productID 
            WHERE userID=?`;
        const products = await query(productsQuery, [userID]);

        const totalQuery = `
            SELECT SUM(total_cost) AS total
            FROM cart 
            WHERE userID=?`;
        const totalResult = await query(totalQuery, [userID]);

        const response = {
            cart: products,
            total: totalResult[0].total
        };

        res.json(response);
    } catch (err) {
        res.status(500).send('Database error: ' + err);
    }
});

router.get('/payment/:userID', async (req, res) => {
    const userID = req.params.userID;

    try {
        const paymentQuery = `
            SELECT payment_mode, payment_address 
            FROM payments 
            WHERE paymentID IN (
                SELECT \`order\`.paymentID 
                FROM \`order\` 
                WHERE \`order\`.userID=?)`;
        const results = await query(paymentQuery, [userID]);

        res.json(results);
    } catch (err) {
        res.status(500).send('Database error: ' + err);
    }
});

router.post('/buy_now/:userID', async (req, res) => {
    const userID = req.params.userID;
    const { mode, address, coupon } = req.body;

    try {
        await query('START TRANSACTION');

        if (coupon) {
            const couponQuery = `
            SELECT * 
            FROM coupons
            WHERE couponID=? 
            AND expiry > CURRENT_DATE and is_used=0`;

            const couponResult = await query(couponQuery, [coupon]);

            if (couponResult.length === 0) {
                await query('ROLLBACK');  // Rollback the transaction before sending response
                return res.status(400).send("Invalid coupon");
            }
        }

        const availableProductsQuery = `
            SELECT productID, product_name, price 
            FROM product 
            WHERE productID IN (
                SELECT cart.productID 
                FROM cart, product 
                WHERE cart.userID=? 
                AND cart.productID=product.productID 
                AND cart.quantity < product.quantity
            )`;
        const products = await query(availableProductsQuery, [userID]);

        await query(`INSERT INTO payments(payment_mode, payment_address) VALUES(?, ?)`, [mode, address]);

        const paymentIDResult = await query(`SELECT MAX(paymentID) AS paymentID FROM payments`);
        const paymentID = paymentIDResult[0].paymentID;

        const totalCostResult = await query(`SELECT SUM(total_cost) AS total FROM cart WHERE userID=?`, [userID]);
        const cost = totalCostResult[0].total;

        //fetch the privilege_status of the user
        const privilegeStatusResult = await query(`SELECT privilege_status FROM user WHERE userID=?`, [userID]);

        //if privilege_status is 'pro' then deliver the order in 2 days
        if (privilegeStatusResult[0].privilege_status === 'pro') {
            await query(`INSERT INTO \`order\`(delivery_address, userId, order_value, delivery_date, couponID, paymentID) VALUES(?, ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), ?, ?)`, [address, userID, cost, coupon, paymentID]);
        } else {
            await query(`INSERT INTO \`order\`(delivery_address, userId, order_value, delivery_date, couponID, paymentID) VALUES(?, ?, ?, DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), ?, ?)`, [address, userID, cost, coupon, paymentID]);
        }

        await query(`INSERT INTO my_orders 
                     SELECT \`order\`.orderID, productID, quantity, total_cost 
                     FROM cart, \`order\` 
                     WHERE cart.userID=\`order\`.userId 
                     AND cart.userID=? 
                     AND orderID=(SELECT MAX(orderID) FROM \`order\`)`, [userID]);

        await query(`UPDATE product, cart 
                     SET product.quantity=product.quantity-cart.quantity 
                     WHERE cart.userID=? 
                     AND cart.productID=product.productID`, [userID]);

        await query(`DELETE FROM cart WHERE cart.userID=?`, [userID]);

        await query('COMMIT');
        return res.status(200).send('Order processed successfully');

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).send('Error: ' + error.message);
    }

});


router.get('/privilege/:userID', async (req, res) => {
    // console.log("Privilege request received from userID", req.params.userID);
    const userID = req.params.userID;
    try {
        const privilegeQuery = `
            SELECT privilege_status 
            FROM user 
            WHERE userID=?`;
        const results = await query(privilegeQuery, [userID]);
        res.json(results);
    } catch (err) {
        res.status(500).send('Database error: ' + err);
    }
});

router.get('/first_name/:userID', async (req, res) => {
    // console.log("First name request received from userID", req.params.userID);
    const userID = req.params.userID;
    try {
        const firstNameQuery = `
            SELECT first_name 
            FROM user 
            WHERE userID=?`;
        const results = await query(firstNameQuery, [userID]);
        res.json(results);
    } catch (err) {
        res.status(500).send('Database error: ' + err);
    }
});

router.post('/cart/:userID/:productID', async (req, res) => {
    const userID = req.params.userID;
    const productID = req.params.productID;
    const { quantity } = req.body;

    try {
        const productQuantityResult = await query(`SELECT quantity FROM product WHERE product.productID=?`, [productID]);
        const availableQty = productQuantityResult[0].quantity;

        if (availableQty < quantity) {
            res.status(400).send("Can't add to cart, qty too large");
        } else {
            // Calculate total cost
            const totalCostResult = await query(`SELECT price * ? AS totalCost FROM product WHERE product.productID=?`, [quantity, productID]);
            const totalCost = totalCostResult[0].totalCost;

            // Insert into cart
            await query(`INSERT INTO cart VALUES(?, ?, ?, ?)`, [userID, totalCost, productID, quantity]);
            await query(`UPDATE product SET quantity = quantity - ? WHERE productID = ?`, [quantity, productID]);
            await query('COMMIT', []);

            res.status(200).send("Success");
        }
    } catch (error) {
        await query('ROLLBACK', []);
        console.error(error);
        res.status(500).send('Error: ' + error);
    }
});

router.put('/cart/:userID/:productID', async (req, res) => {
    const userID = req.params.userID;
    const productID = req.params.productID;
    const { quantity } = req.body;
    // console.log(userID, productID, quantity);
    try {
        const productQuantityResult = await query(`SELECT quantity FROM product WHERE product.productID=?`, [productID]);
        const cartResult = await query(`SELECT * FROM cart WHERE productID=? AND userID=?`, [productID, userID]);
        const availableQty = productQuantityResult[0].quantity;
        if (cartResult.length === 0) {
            res.status(400).send("Product not in cart");
        } else {
            if (availableQty < quantity) {
                res.status(400).send("Can't update cart, qty too large");
            } else {

                await query(`UPDATE cart SET quantity = quantity + ? WHERE productID=? AND userID=?`, [quantity, productID, userID]);
                await query(`UPDATE product SET quantity = quantity - ? WHERE productID = ?`, [quantity, productID])
                await query(`DELETE FROM cart WHERE quantity=0 AND productID=? AND userID=?`, [productID, userID]);
                await query('COMMIT', []);

                res.status(200).send("Success");
            }
        }
    } catch (error) {
        await query('ROLLBACK', []);
        console.error(error);
        res.status(500).send('Error: ' + error);
    }
});

router.delete('/cart/:userID/:productID', async (req, res) => {
    const userID = req.params.userID;
    const productID = req.params.productID;

    try {
        await query('START TRANSACTION');

        const cartResult = await query(`SELECT * FROM cart WHERE productID=? AND userID=?`, [productID, userID]);
        if (cartResult.length === 0) {
            res.status(400).send("Product not in cart");
        } else {
            await query(`UPDATE product SET quantity = quantity + (SELECT quantity FROM cart WHERE productID=? AND userID=?) WHERE productID=?`, [productID, userID, productID]);
            await query(`DELETE FROM cart WHERE productID=? AND userID=?`, [productID, userID]);
            await query('COMMIT', []);
            res.status(200).send("Success");
        }
    } catch (error) {
        await query('ROLLBACK', []);
        console.error(error);
        res.status(500).send('Error: ' + error);
    }
});

// Endpoint to cancel order
router.delete('/cancel_order/:orderID', async (req, res) => {
    const orderID = req.params.orderID;
    const { userID } = req.body;
    try {

        const orderUserResult = await query(`SELECT * FROM \`order\` WHERE orderID=? AND userID=?`, [orderID, userID]);
        if (orderUserResult.length === 0) {
            res.status(400).send("Order does not exist or does not belong to user");
        } else {
            const orderResult = await query(`SELECT paymentID FROM \`order\` WHERE orderID=?`, [orderID]);
            if (orderResult.length === 0) {
                res.status(400).send("Order does not exist");
            } else {
                //check if delivery date is in the future
                const deliveryDateResult = await query(`SELECT delivery_date FROM \`order\` WHERE orderID=?`, [orderID]);
                const deliveryDate = deliveryDateResult[0].delivery_date;
                const today = new Date();
                if (today > deliveryDate) {
                    res.status(400).send("Can't cancel order, delivery date has passed");
                } else {
                    await query('START TRANSACTION');

                    await query(`UPDATE product, my_orders 
                         SET product.quantity = product.quantity + my_orders.quantity 
                         WHERE my_orders.orderID=? 
                         AND my_orders.productID=product.productID`, [orderID]);

                    await query(`DELETE FROM payments WHERE paymentID IN (
                            SELECT paymentID FROM \`order\` WHERE orderID=?)`, [orderID]);

                    await query('COMMIT', []);

                    res.status(200).send("Order cancelled successfully");
                }
            }
        }
    } catch (error) {
        await query('ROLLBACK', []);
        console.error(error);
        res.status(500).send('Error: ' + error);
    }
});

module.exports = router;