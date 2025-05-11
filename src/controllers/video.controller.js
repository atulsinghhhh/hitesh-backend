import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import {Video} from '../models/video.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import {User} from '../models/user.model.js';

const getAllVideos = asyncHandler(async (req, res) => {
    const{page =1,limit=10,query,sortBy,sortType='dsc',userId}=req.query;

    const pageNumber=parseInt(page);
    const pageSize=parseInt(limit);

    if (isNaN(pageNumber) || pageNumber <= 0) {
        throw new ApiError(400, "Invalid page number");
    }

    if (isNaN(pageSize) || pageSize <= 0) {
        throw new ApiError(400, "Invalid limit value");
    }

    const skip=(pageNumber-1)*pageSize;
    const sortField=sortBy;
    const sortOrder=sortType==='asc' ? 1:-1

    let filter={};
    if(query){
        filter.title={$regex: query,$options: 'i'}
    }

    if(userId){
        filter.userId=userId;
    }
    const videos=await Video.find(filter)
        .sort({[sortField]:sortOrder})
        .skip(skip)
        .limit(pageSize)

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                videos
            },
            "fetch all the video sucessfully"
        )
    )
})

const publishAVideo=asyncHandler(async(req,res)=>{
    // get video upload to cloudinary

    const {title,description}=req.body;
    if(!title && !description){
        throw new ApiError(400,"title and description are required");
    }
    const file=req.file;
    if(!file){
        throw new ApiError(400,"No video file provided");
    }
    const result=await uploadOnCloudinary(req.file.path);
    if(!result){
        throw new ApiError(500,"uploaded failed !!")
    }
    return res.status(200)
        .json(
            new ApiResponse(
                200,
                {
                    title,
                    description,
                    videoUrl: result.secure_url,
                    publicId: result.public_id,
                    resourceType: result.resource_type
                },
                "Video uploaded successfully"
            )
        );
})

const getVideoById=asyncHandler(async(req,res)=>{
    const {videoId}= req.paras;
    if(!videoId){
        throw new ApiError(400,"video id is required");
    }
    

})

export{
    getAllVideos,
    publishAVideo
}