import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { dirname } from 'path';
import path from 'path';
import { router } from './routes/userRouter.js';
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import { adminRouter } from './routes/adminRouter.js';
import { generateBreadcrumbs } from './middlewares/breadCrumb.js';
import userSessionMiddleware from './middlewares/userSession.js';
import errorHandler from './middlewares/errorHandler.js';
import cartCountMiddleware from './helpers/cartCounter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'views/user'),
  path.join(__dirname, 'views/admin'),
]);
app.use(express.static(path.join(__dirname, 'public')));

app.use(generateBreadcrumbs);

app.use(userSessionMiddleware);

app.use(cartCountMiddleware);
app.use('/', router);
app.use('/admin', adminRouter);
app.use(errorHandler);

app.listen(process.env.PORT, () => {
  console.log(
    `You application is Running on http://localhost:${process.env.PORT}`,
  );
});
