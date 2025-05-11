import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key:  process.env.CLOUDINARY_API_KEY,
        api_secret:  process.env.CLOUDINARY_API_SECRET
    });


// const uploadOnCloudinary=async(localFilePath)=>{
//     try {
//         if(!localFilePath) return null;
//         //upload the file on cloudinary
//         const response=await cloudinary.uploader.upload(localFilePath,{
//             resource_type:"auto",
//         })
        
//         // file has been uploaded successfully
//         // console.log("file is uploaded on cloudinary",response.url);
//         fs.unlinkSync(localFilePath); //remove the file from local storage
//         return response;
//     } catch (error) {
//         fs.unlinkSync(localFilePath); //remove the file from local storage
//         return null;
        
//     }

// }

const uploadOnCloudinary=async(localFilePath)=>{
    try{
        if(!localFilePath) return null;
        const response=await cloudinary.uploader.upload(localFilePath,{
            resource_type: "video",
        })

        console.log("Video is uploaded sucessfully on cloudinary ",response.url);
        return response;
        
    }catch(e){
        fs.unlinkSync(localFilePath) // remove from the local path
        console.error("cloudiary upload Error: ",e);
        return null;
    }
}

export {uploadOnCloudinary};
    