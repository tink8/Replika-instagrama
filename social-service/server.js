const express = require("express");
const app = express();

app.use(express.json());

const blockRoutes = require("./routes/checkBlock");
const notificationRoutes = require("./routes/followNotification");

app.use("/social", blockRoutes);
app.use("/social", notificationRoutes);

app.listen(3002, () => {
    console.log("Social Service running on port 3002");
});