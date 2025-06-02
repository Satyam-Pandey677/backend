import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError} from "../utils/ApiError.js"
import { User } from '../models/user.model.js';
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"
import mongoose from 'mongoose';


 

const generateAccessAndRefreshTokens =async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
       const  refreshToken = user.generateRefreshToken()
       
       user.refreshToken = refreshToken
       await user.save({ validateBeforeSave : false })

        return {
            accessToken,
            refreshToken
        }

    } catch (error) {
        throw new ApiError(500,"Something Went Wrong Whilw Generating Refresh and access token")
    }
}

const registerUser =  asyncHandler(async (req, res) => {
    // get details from front-end
    //validation - not empty
    //check if user already exist : username & email
    //acheck for images, check for avtar
    //upload them to cloudinary
    //create user object - create entry in db
    //remove password and refresh token field
    // check for user creation
    // return res

    const {username,email,fullname, password} = req.body;

    if(
        [fullname,email,password,username].some((field) => field?.trim() == "")
    ){
        throw new ApiError(400,"All fields are required ")
    }

    const existedUser = await User.findOne({
        $or : [{username},{email}]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or username is allready exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    
    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is requied")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar ){
        throw new ApiError(400, "Avatar file is requied")
    }

    const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email : email,
        password:password,
        username : username.toLowerCase() 
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering a user")
    }


    return res.status(201).json(
        new ApiResponse(
            200,
            createdUser,
            "User Registerd Successfully",
        )
    )
    
})
 
const loginUser = asyncHandler(async(req,res) => {
    //req body
    //username and email hai ke nhi
    //find the user 
    //password check
    //access and refresh token
    //send in cookies

    const {username,email, password} = req.body;
    if (!username && !email){
        throw new ApiError(400,"Username or email is required")
    }

    const user = await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "User Does not exist")
    }

    const isPasswordValide = await user.isPasswordCorrect(password)

    if(!isPasswordValide){
        throw new ApiError(401, "Invalid user credentials")
    }
 

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const logedInUser = await User.findById(user._id).select("-password -refreshToken ")

    const options = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken,options)
    .cookie("refreshToken", refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : logedInUser,accessToken,refreshToken
            },
            "User Logged in Successfully"
        )
    )

})

const logOutUser = asyncHandler(async(req,res) => {
    // const user = req.user._id
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken : 1
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly : true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {} ,"User Logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshhToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshhToken){
        throw new ApiError(401, "Unauthorized Requiest")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshhToken,  process.env.REFRESH_TOKEN_SECRET )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "invalid refresh token")
        }
    
        if(incomingRefreshhToken != user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure :true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken)
        .cookie("refreshToken", newrefreshToken)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newrefreshToken},
                "Access Token Refreshed"
    
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message  || "Invalid refresh token")
    }
})

const currentPasswordChange = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword, conformPassword} = req.body

    if(!(newPassword == conformPassword)){
        throw new ApiError(401, "New Password and Conform Password not same")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, " invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Password Changed SuccessFull"
        )
    )
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "Current user Fetched Successfully"
    ))
})

const UpdateAccountUser = asyncHandler(async(req, res) => {
    const {fullname , email} = req.body

    if(!fullname || !email){
        throw new ApiError(401, "All field are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email:email,

            }
        },
        {new:true}
    ).select("-password")


    return res
    .status(200)
    .json(new ApiResponse(
        200,
        user,
        "Account details updated successfully"
    ))
})

const updateAccountAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO : delete old image  - assignment
    

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading an error")
    }

    const user = await User.findById(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new :true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user, "avatar update succesfully"))
 })

const updateAccountCoverImage = asyncHandler(async(req,res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading an error")
    }

    await User.findById(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new :true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user, "avatar update succesfully"))
 })

const getUserChannelprofile = asyncHandler(async(req,res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }


    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelSubscribeToCount: {
                    $size : "$subscribedTo"
                },

                isSubscribed :{
                    $cond: {
                        if:{$in:[req.user._id,"$subscribers.subscriber"]},
                        then:true,
                        else:false,
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelSubscribeToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel does not exist")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"User Channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        200,
        user,
        "Watch history fetched"
    )
})
 

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken, 
    currentPasswordChange,
    getCurrentUser,
    UpdateAccountUser,
    updateAccountAvatar,
    updateAccountCoverImage,
    getUserChannelprofile,
    getWatchHistory
}