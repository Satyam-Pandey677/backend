import mongoose,{isValidObjectId} from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";


const getAllVideos = asyncHandler(async(req,res) => {
    const {page = 1, limit =10 , query, sortBy,sortType, userId} = query;

    //Todo : get all videos bases on the query, sort and pagination

})

const publishAVideo = asyncHandler(async(req, res) => {
    const {videoFile, thumbnail, title, discription} = req.body
    //todo : get video, upload to cloudinary, create video
    
})

const getVideoById = asyncHandler(async(req,res) => {
    const {videoId} = req.params;
    //Todo : get video by id
})

const updateVideo = asyncHandler(async(req,res) => {
    const {videoId} = req.params

})

const deleteVideo = asyncHandler(async(req,res) => {
    const {videoId} = req.params
    //Todo : delete video
})

const togglePublishStatus = asyncHandler(async(req, res) => {
    const {videoId} = req.params
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