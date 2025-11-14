import express from 'express'
import dotenv from 'dotenv'
import {connectDB} from './config/db.js'
import {dirname} from 'path';
import path from 'path';
import {router} from './routes/userRouter.js'
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import User from './models/userSchema.js';
import {adminRouter} from './routes/adminRouter.js'


const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72*60*60*1000
    }
}))


app.use(passport.initialize());
app.use(passport.session());

app.set("view engine","ejs")
app.set("views", [path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,'public')));




app.use(async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user);
      res.locals.user = user;
    } else {
      res.locals.user = null;
    }
    next();
  } catch (error) {
    console.error("Error in user session middleware:", error);
    res.locals.user = null;
    next();
  }
});

app.use("/", router)
app.use("/admin", adminRouter);


app.listen(process.env.PORT, () => {
    console.log("Running");
    
})