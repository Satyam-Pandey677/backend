import mongoose,{isValidObjectId} from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const getAllVideos = asyncHandler(async(req,res) => {
    // const {page = 1, limit =10 , query, sortBy,sortType, userId} = query;

    //Todo : get all videos bases on the query, sort and pagination


})

const publishAVideo = asyncHandler(async(req, res) => {
    const {title, discription} = req.body
    //todo : get video, upload to cloudinary, create video
    
    // Checking if title or discription are available or not
    if(!title || !discription){
        throw new ApiError(400,"All fields are required")
    }

    const videoLocalPath = req.files?.videoFile[0].path

    if(!videoLocalPath){
        throw new ApiError(400, "Video is required");
    }
    
    const thumbnailLocalPath = req.files?.thumbnail[0].path

    if(!thumbnailLocalPath){
        throw new ApiError(400,"Thumbnail is required")

    }

    // const videoDuration = await getVideoDuration(videoLocalPath)
    // if(!videoDuration){
    //     throw new ApiError(401, "Video Duration not available")
    // }
    // console.log(videoDuration)
    
   const video = await uploadOnCloudinary(videoLocalPath);
   const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
   

   const videoPost = await Video.create({
    title,
    discription,
    videoFile:{
        ulr : video.url,
        _id: video.public_id
    },
    thumbnail:{
        ulr : thumbnail.url,
        _id: thumbnail.public_id
    },
    duration:video.duration,
    owner:req.user?._id,
    isPublished:true,
   })
   
   const videoCreated = await Video.findById(videoPost._id).populate("owner","-password -refreshToken -watchHistory")

   if(!videoCreated){
    throw new ApiError(500, "Something went wrong while creating a video")
   }


   
   return res.status(200)
   .json(
    new ApiResponse(
        200,
        videoCreated,
        "video created Successfully"
    )
   )
}) 

const getVideoById = asyncHandler(async(req,res) => {
    const {videoId} = req.params;
    //Todo : get video by id
    if(!videoId){
        throw new ApiError(404,"Id not found")
    }

    const video = await Video.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from :"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {
                        $project:{
                            fullname: 1,
                            username: 1,
                            thumbnail :1,
                            _id:1
                        }
                    }
                ]
            }
        },
        {
            $unwind:"$owner"
        },{
            $lookup:{
                from: "views",
                localField:"_id",
                foreignField:"videoId",
                as:"views"
            }
        },{
      $addFields: {
        totalViews: { $size: "$views" }, 
      },
    },
    {
      $project: {
        views: 0,
      },
    },
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "video Fetched Successfully"
        )
    )
})

const updateVideo = asyncHandler(async(req,res) => {
     const {videoId} = req.params
     const {title, discription} = req.body
     

     const videoRes = await Video.findById(videoId)

     console.log(videoRes)
     await deleteOnCloudinary(videoRes.thumbnail._id);

     const thumbnailFile = req.files?.thumbnail[0].path
     console.log(thumbnailFile)

     const thumbnail = await uploadOnCloudinary(thumbnailFile)
     
     console.log(thumbnail)

 
     const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                title,
                discription,
                thumbnail,
            }
        },
        {new: true}
     ).select("-password -refreshToken")

     return res.status(200)
     .json(
        new ApiResponse(
            200,
            video,
            "Video Successfully upgrated"
        )
     )
})

const deleteVideo = asyncHandler(async(req,res) => {
    const {videoId} = req.params
    //Todo : delete video
    const video = await Video.findByIdAndDelete(videoId)
    

    if(!video){
        throw new ApiError(400, "video not delete")
    }

    const deletedVideo = await deleteOnCloudinary(video.videoFile?._id,"video")
    if(!deletedVideo) {
        throw new ApiError(400, "video id not valid")
    }
    const deleteThumbnail = await deleteOnCloudinary(video.thumbnail?._id, "image")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video deleted successfully"
        )
    )
})

const togglePublishStatus = asyncHandler(async(req, res) => {
    // const {videoId} = req.params
    //Todo : toggle publish status
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}