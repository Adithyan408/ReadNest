import express from 'express'
import dotenv from 'dotenv'
import {connectDB} from './config/db.js'


dotenv.config();

const app = express();
connectDB();
app.get("/", (req, res) => {
    res.send("Helloo")
});


app.listen(process.env.PORT, () => {
    console.log("Running");
    
})