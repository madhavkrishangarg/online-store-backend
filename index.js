require('./dbKeepAlive');

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const authRouter = require('./routes/auth');
app.use('/api', authRouter);

const searchRouter = require('./routes/search');
app.use('/api', searchRouter);

const userRouter = require('./routes/user');
app.use('/api', userRouter);

const adminRouter = require('./routes/admin');
app.use('/api', adminRouter);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
