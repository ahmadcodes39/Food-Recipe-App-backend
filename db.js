import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config()

const mongooseUri = process.env.MONGOOSE_URI
const connectToMongo=async()=>{
    try {
        const response = await mongoose.connect(mongooseUri)
        if (response) {
            console.log('Connected to mongo successfully')
        }
        else{
            console.log('error is connecting to mongo')
        }
    } catch (error) {
        console.log(error.message)
    }
}

export default connectToMongo