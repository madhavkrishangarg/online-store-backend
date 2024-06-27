const express = require('express');
const router = express.Router();
const db = require('../db');

router.post('/search', async (req, res) => {
    console.log('Search request:', req.body);
    const prompt = req.body.prompt;
    const search_term = '%' + prompt + '%';
    db.query(
        `SELECT DISTINCT product.productID, product_name, price
FROM product
JOIN product_category_map ON product.productID = product_category_map.productID
LEFT JOIN category ON product_category_map.categoryID = category.categoryID
WHERE product_name LIKE ?
OR category.category_name LIKE ?
ORDER BY price;
`, [search_term],

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
