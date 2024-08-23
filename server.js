import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import authRouter from './Routes/auth.js'
import connectToMongo from './db.js'
import cookieParser from 'cookie-parser'
import recipeRouter from './Routes/operations.js'

dotenv.config()
connectToMongo()
const app = express()
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const port=process.env.PORT||5000

app.use('/auth',authRouter)
app.use('/api',recipeRouter)

app.listen(port,()=>{
    console.log(`Server started on port ${port}`)  
})