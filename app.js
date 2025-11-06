import express from 'express'
import dotenv from 'dotenv'
import {connectDB} from './config/db.js'
import {dirname} from 'path';
import path from 'path';
import {router} from './routes/userRouter.js'
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config();
connectDB();

const app = express();

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.set("view engine","ejs")
app.set("views", [path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')));

app.use("/", router)




app.listen(process.env.PORT, () => {
    console.log("Running");
    
})