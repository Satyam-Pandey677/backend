import mongoose, { Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile : {
            type :String,
            required :true,
        },
        thumbnail : {
            type :String,
            required :true,
        },
        title :{
            type :String,
            required :true
        },
        discription :{
            type : String ,
            required : true
        },

        duration :{
            type :Number,
            required : true
        },
        views :{
            type :Number,
            defualt : 0
        },

        isPublished : {
            type :String,
            defualt :true
        },

        owner : {
            type : mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps:true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)