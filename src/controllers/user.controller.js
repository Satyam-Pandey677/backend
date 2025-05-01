import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError} from "../utils/ApiError.js"
import { User } from '../models/user.model.js';
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"
 

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

 

export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken
}