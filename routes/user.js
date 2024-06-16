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
    console.log(userID);

    try {
        const productsQuery = `
            SELECT product_name, mo.quantity
            FROM product
            JOIN my_orders mo ON product.productID = mo.productID
            WHERE orderID IN (
                SELECT orderID
                FROM \`order\`
                JOIN user u ON u.userID = \`order\`.userId
                WHERE \`order\`.userId=?
            );
        `;
        const products = await query(productsQuery, [userID]);

        const totalQuery = `
            SELECT SUM(order_value) AS total
            FROM \`order\`
            WHERE userID=?;
        `;
        const totalResult = await query(totalQuery, [userID]);

        const response = {
            products: products,
            total: totalResult[0].total
        };

        res.json(response);
    } catch (err) {
        res.status(500).send('Database error: ' + err);
    }
});

router.get('/cart/:userID', async (req, res) => {
    const userID = req.params.userID;

    try {
        const productsQuery = `
            SELECT product_name, cart.quantity 
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

        // Fetch products in cart that are available
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

        // Insert into payments
        await query(`INSERT INTO payments(payment_mode, payment_address) VALUES(?, ?)`, [mode, address]);

        // Get the latest payment ID
        const paymentIDResult = await query(`SELECT MAX(paymentID) AS paymentID FROM payments`);
        const paymentID = paymentIDResult[0].paymentID;

        // Get the total cost of items in the cart
        const totalCostResult = await query(`SELECT SUM(total_cost) AS total FROM cart WHERE userID=?`, [userID]);
        const cost = totalCostResult[0].total;

        // Insert into orders
        await query(`INSERT INTO \`order\`(delivery_address, userId, order_value, delivery_date, couponID, paymentID) VALUES(?, ?, ?, CURRENT_DATE, "dbms", ?)`, [address, userID, cost, paymentID]);

        // Insert into my_orders
        await query(`INSERT INTO my_orders 
                     SELECT \`order\`.orderID, productID, quantity, total_cost 
                     FROM cart, \`order\` 
                     WHERE cart.userID=\`order\`.userId 
                     AND cart.userID=? 
                     AND orderID=(SELECT MAX(orderID) FROM \`order\`)`, [userID]);

        // Update product quantities
        await query(`UPDATE product, cart 
                     SET product.quantity=product.quantity-cart.quantity 
                     WHERE cart.userID=? 
                     AND cart.productID=product.productID`, [userID]);

        // Delete items from cart
        await query(`DELETE FROM cart WHERE cart.userID=?`, [userID]);

        await query('COMMIT');
        res.status(200).send('Order processed successfully');

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        res.status(500).send('Error: ' + error.message);
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

    try {
        // Check product quantity
        const productQuantityResult = await query(`SELECT quantity FROM product WHERE product.productID=?`, [productID]);
        const availableQty = productQuantityResult[0].quantity;

        const cartResult = await query(`SELECT quantity FROM cart WHERE productID=? AND userID=?`, [productID, userID]);
        if (cartResult.length === 0) {
            res.status(400).send("Product not in cart");
        } else {
            if (availableQty < quantity) {
                res.status(400).send("Can't update cart, qty too large");
            } else {
                // Update cart quantity
                await query(`UPDATE cart SET quantity = ? WHERE productID=? AND userID=?`, [quantity, productID, userID]);
                await query(`UPDATE product SET quantity = quantity - ? WHERE productID = ?`, [quantity, productID]);
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