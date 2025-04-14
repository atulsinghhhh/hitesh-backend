import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";


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
    /*
    get refresh token from cookie and body
    check if refresh token is provided
    verify refresh token from secret key
    check if user exists
    check if refresh token is valid 
    generate new access token and refresh token
    send cookie 
    return response
    */
    const refreshToken=req.cookies.refreshToken || req.body.refreshToken ;

    if(!refreshToken){
        throw new ApiError(401,"Refresh token is required");
    }

    try {
        const decoded=jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET);
    
        if(!decoded){
            throw new ApiError(401,"Invalid refresh token");
        }
    
        const user=await User.findById(decoded._id);
    
        if(!user){
            throw new ApiError(401,"User not found");
        }

        // if (refreshToken !== user?.refreshToken) {
        //     throw new ApiError(401, "Refresh token is expired or used");
        // }
        
    
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

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    /*
    get user id from req
    check if user exits
    check if current password is correct
    update password
    save user
    return response
    */
   const {oldPassword,newPassword} = req.body

    // if(!(newPassword===confirmPassword)){
    //         throw new ApiError(400,"New password and confirm password do not match")
    // }

   const user=await User.findById(req.user?._id)
   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Current password is incorrect")
    }

    user.password=newPassword;
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            null,
            "Password updated successfully"
        )
    )
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            req.user,
            "current user fetched sucessfully"
        )
    )
})

const updateCurrentDetails=asyncHandler(async(req,res)=>{
    /*
    get user id from req
    check if user exits
    update user details
    save user
    return response
    */
   const {fullname,email} =req.body

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")

    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email: email
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "User details updated successfully"
        )
    )

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    /*
    get user id from req
    check if user exits
    check if avatar is provided
    upload avatar to cloudinary
    update user avatar
    save user
    return response
    */
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath);

    // todo delete old avatar

    if(!avatar.url){
        throw new ApiError(400,"Failed to upload avatar on cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")


    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "User avatar updated successfully"
        )
    )
})


const updateUserCoverImage=asyncHandler(async(req,res)=>{
    /*
    get user id from req
    check if user exits
    check if avatar is provided
    upload avatar to cloudinary
    update user avatar
    save user
    return response
    */
    const coverImageLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const coverImage= await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Failed to upload cover image on cloudinary")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "User cover image updated successfully"
        )
    )
})
const getUserChannelProfile=asyncHandler(async(req,res)=>{

    const {username}=req.params

    if(!username?.trim()){
        throw new ApiError(400,"Username is required")
    }
    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase(),
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as : "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "Subscriber",
                as : "sudscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelSubscribers:{
                    $size: "$sudscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.Subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                subscribersCount:1,
                channelSubscribers:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404,"Channel not found")
    }
    
    return res.status(200)
    .json(
        ApiResponse(
            200,
            channel[0],
            "Channel profile fetched successfully"
        )
    )
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateCurrentDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}