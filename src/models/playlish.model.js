import mongoose from "mongoose";

const playListSchema = new mongoose.Schema(
    {
        name:{
            type:String,
            required:true
        },
        discription:{
            type:String,
            required:true
        },
        videos:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:"Video"
            }
        ]
        
    }
)