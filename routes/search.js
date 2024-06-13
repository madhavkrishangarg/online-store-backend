const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/search', async (req, res) => {
    const prompt = req.body.prompt;
    const search_term = '%' + prompt + '%';
    db.query(
        `select product.productID, product_name, price from product join product_category_map on product.productID = product_category_map.productID where categoryID in (select categoryID from category where category_name like ?) order by price;`, [search_term],

        async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).send('Internal server error');
            }
            res.send(results);
        }
    );
});

module.exports = router;
