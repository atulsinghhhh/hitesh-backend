import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import Jwt from "jsonwebtoken";


const registerUser = asyncHandler(async (req, res) => {
    /*
    get user details from req.body
    validate user details
    check if user already exists
    check if user image is provided
    upload user image to cloudinary,avatar 
    create user object - create entry in db
    remove password and refresh token from response
    check of user is created successfully or not
    return response
    */

    const {username,fullname,email,password}=req.body;
    console.log("username: ",username);

    // if(!username || !fullname || !email || !password){
    //     throw new ApiError(400,"All fields are required");
    // }

    if([username,fullname,email,password].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fields are required");
    }

    const existingUser=await User.findOne({
        $or:[
            {username},
            {email}
        ]
    })

    if(existingUser){
        throw new ApiError(409,"User already exists with this username or email");
    }

    const avatarLocalPath=req.files?.avatar[0]?.path
    // const coverImageLocalPath=req.files?.coverImage[0]?.path
    console.log(req.files);
    console.log("avatarLocalPath: ",avatarLocalPath);

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath);

    if(!avatar){
        throw new ApiError(400,"Failed to upload avatar on cloudinary");
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    // if(!coverImage){
    //     throw new ApiError(400,"Failed to upload cover image on cloudinary");
    // }

    const user=await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        username:username.toLowerCase(),
        email,
        password,
    })

    // if(!user){
    //     throw new ApiError(500,"Something went wrong while registering a new user");
    // }
    const createdUser=await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering a new user");
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )
})

const generateAccessAndRefreshTokens= async(userId)=>{
    try {
        const user=await User.findById(userId);

        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();

       user.refreshToken=refreshToken; // save refresh token in db
       await user.save({validateBeforeSave:false});

       return {accessToken,refreshToken};  
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and acces token")
        
    }
}
const loginUser=asyncHandler( async (req,res)=>{
    /* email or username  password req.body
    check if user exists
    check if password is correct 
    generate access token and refresh token
    send cookie
    return response*/

    const {email,username,password}=req.body;
    if(!username && !email){
        throw new ApiError(400,"Username or email is required");
    }

    const user=await User.findOne({
        $or:[ // we write object inside the array
            {username},
            {email}
        ]
    })

    if(!user){
        throw new ApiError(404,"User not found with this username or email");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(400,"Invalid password");
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);

    const userDetails=await User.findById(user._id).select("-password -refreshToken");

    const options={
        httpsOnly: true,
        secure: true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: userDetails,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser=asyncHandler(async(req,res)=>{
    /*
    get user id from req
    find user in db
    refresh token to null
    save user
    clear cookie
    return response
    */
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            },
            new:true

        }

    )

    const options={
        httpsOnly: true,
        secure: true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(
            200,
            null,"User logged out successfully"
        )
    )

    
})
const refreshAccessToken=asyncHandler(async(req,res)=>{
    // encoded refresh token
    const refreshToken=req.cookies.refreshToken || req.body.refreshToken ;

    if(!refreshToken){
        throw new ApiError(401,"Refresh token is required");
    }

    try {
        const decoded=Jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET);
    
        if(!decoded){
            throw new ApiError(401,"Invalid refresh token");
        }
    
        const user=await User.findById(decoded._id);
    
        if(!user){
            throw new ApiError(401,"User not found");
        }
    
        if(dedcoded !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used") 
        }
    
        const options={
            httpsOnly: true,
            secure: true
        }
    
        const[accessToken,refreshTokens]=await generateAccessAndRefreshTokens(user._id);
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshTokens,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken:refreshTokens
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(500,"Something went wrong while refreshing access token");
    }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}