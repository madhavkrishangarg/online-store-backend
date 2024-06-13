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

module.exports = router;
