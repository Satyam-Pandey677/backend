import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import { ApiError } from './ApiError.js';

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret:  process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async(localFilePath) => {
    try {
        if(!localFilePath) return null;
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        });
        //file has been successfully upload
        // console.log("file is uplaoded in cloudinary",response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null
    }
}

const deleteOnCloudinary = async(fileId,fileType) => {
    try {
        if(!fileId){
            throw new ApiError(400, "FileId not found")
        }

        const response = await cloudinary.uploader.destroy(fileId,{
            resource_type:fileType
        })

        return response
    } catch (error) {
        console.log(error)
        return null
    }
}

export {
    uploadOnCloudinary,
    deleteOnCloudinary
}
