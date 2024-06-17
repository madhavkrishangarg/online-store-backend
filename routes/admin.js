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


router.put('/update_price/:productID', async (req, res) => {
    const productID = req.params.productID;
    const { adminID, price } = req.body;

    const adminQuery = 'SELECT * FROM admin WHERE adminID = ?';
    const admin = await query(adminQuery, [adminID]);
    if (admin.length === 0) {
        res.status(401).send('Invalid admin ID');
        return;
    }

    try {
        const updatePriceQuery = 'UPDATE product SET price = ? WHERE productID = ?';
        await query(updatePriceQuery, [price, productID]);
        res.status(200).send('Success');
        await query('COMMIT', []);
    } catch (error) {
        await query('ROLLBACK', []);
        console.error('Database error:', error);
        res.status(500).send('Internal server error');
    }
});

router.put('/add_quantity/:productID', async (req, res) => {
    const productID = req.params.productID;
    const { adminID, quantity } = req.body;

    const adminQuery = 'SELECT * FROM admin WHERE adminID = ?';
    const admin = await query(adminQuery, [adminID]);
    if (admin.length === 0) {
        res.status(401).send('Invalid admin ID');
        return;
    }

    try {
        const addQuantityQuery = 'UPDATE product SET quantity = quantity + ? WHERE productID = ?';
        await query(addQuantityQuery, [quantity, productID]);
        res.status(200).send('Success');
        await query('COMMIT', []);
    } catch (error) {
        await query('ROLLBACK', []);
        console.error('Database error:', error);
        res.status(500).send('Internal server error');
    }
});

// Endpoint to add a new product
router.post('/add_product', async (req, res) => {
    const { adminID, name, price, quantity } = req.body;

    //check if adminID is valid
    const adminQuery = 'SELECT * FROM admin WHERE adminID = ?';
    const admin = await query(adminQuery, [adminID]);
    if (admin.length === 0) {
        res.status(401).send('Invalid admin ID');
        return;
    }

    try {
        const addProductQuery = 'INSERT INTO product (product_name, price, quantity) VALUES (?, ?, ?)';
        await query(addProductQuery, [name, price, quantity]);
        const newProductID = (await query('SELECT LAST_INSERT_ID() AS productID'))[0].productID;
        res.status(201).send({ productID: newProductID });
        await query('COMMIT', []);
    } catch (error) {
        await query('ROLLBACK', []);
        console.error('Database error:', error);
        res.status(500).send('Internal server error');
    }
});


router.post('/add_category', async (req, res) => {
    const { adminID, name, info } = req.body;


    const adminQuery = 'SELECT * FROM admin WHERE adminID = ?';
    const admin = await query(adminQuery, [adminID]);
    if (admin.length === 0) {
        res.status(401).send('Invalid admin ID');
        return;
    }

    try {
        const addCategoryQuery = 'INSERT INTO category (category_name, info) VALUES (?, ?)';
        await query(addCategoryQuery, [name, info]);
        const newCatergoryID = (await query('SELECT LAST_INSERT_ID() AS categoryID'))[0].categoryID;
        res.status(201).send({ categoryID: newCatergoryID });
        await query('COMMIT', []);
    } catch (error) {
        await query('ROLLBACK', []);
        console.error('Database error:', error);
        res.status(500).send('Internal server error');
    }
});


router.post('/map_product-category', async (req, res) => {
    const { adminID, productID, categoryID } = req.body;

    const adminQuery = 'SELECT * FROM admin WHERE adminID = ?';
    const admin = await query(adminQuery, [adminID]);
    if (admin.length === 0) {
        res.status(401).send('Invalid admin ID');
        return;
    }

    try {
        const addProductCategoryMapQuery = 'INSERT INTO product_category_map (productID, categoryID) VALUES (?, ?)';
        await query(addProductCategoryMapQuery, [productID, categoryID]);
        res.status(201).send('Success');
        await query('COMMIT', []);
    } catch (error) {
        await query('ROLLBACK', []);
        console.error('Database error:', error);
        res.status(500).send('Internal server error');
    }
});

router.get('/olap1', async (req, res) => {      //query to get total sales and quantity of each category
    try {
        const olap1Query = `
        SELECT
    COALESCE(category.category_name, 'Total') AS category,
    SUM(product.quantity) AS total_quantity,
    SUM(product.price * product.quantity) AS total_sales
FROM
    product
    JOIN product_category_map ON product.productID = product_category_map.productID
    JOIN category ON category.categoryID = product_category_map.categoryID
GROUP BY
    category.category_name WITH ROLLUP
ORDER BY
    total_sales DESC;`;
        const result = await query(olap1Query, []);
        res.status(200).send(result);
        // console.log(result);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Internal server error');
    }
}
);

router.post('/olap2', async (req, res) => {      //query to get total sales and unique customers for each month in a year
    try {
        const year = req.body.year;
        const olap2Query = `
        SELECT
        YEAR(\`order\`.delivery_date) AS year,
        MONTH(\`order\`.delivery_date) AS month,
        COUNT(DISTINCT \`order\`.userId) AS unique_customers,
        SUM(\`order\`.order_value) AS total_sales
    FROM
        \`order\`
    WHERE
        YEAR(\`order\`.delivery_date) = ?
    GROUP BY
        YEAR(\`order\`.delivery_date),
        MONTH(\`order\`.delivery_date) WITH ROLLUP
    ORDER BY
        year ASC,
        month ASC;`;

        const result = await query(olap2Query, [year]);
        res.status(200).send(result);
        // console.log(result);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Internal server error');
    }
}
);

router.get('/olap3', async (req, res) => {      //query to get total revenue for each category in each month of a year
    try {
        const olap3Query =
            `SELECT
            category.category_name AS Category,
            YEAR(\`order\`.delivery_date) AS Year,
            MONTH(\`order\`.delivery_date) AS Month,
            SUM(my_orders.cost) AS Revenue
        FROM
            category
            JOIN product_category_map ON category.categoryID = product_category_map.categoryID
            JOIN product ON product_category_map.productID = product.productID
            JOIN my_orders ON product.productID = my_orders.productID
            JOIN \`order\` ON my_orders.orderID = \`order\`.orderID
        GROUP BY
            category.category_name,
            YEAR(\`order\`.delivery_date),
            MONTH(\`order\`.delivery_date) WITH ROLLUP
        ORDER BY
            category.category_name ASC,
            YEAR(\`order\`.delivery_date) ASC,
            MONTH(\`order\`.delivery_date) ASC;`;

        const result = await query(olap3Query, []);
        res.status(200).send(result);
        // console.log(result);
    }
    catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Internal server error');
    }
}
);


module.exports = router;
