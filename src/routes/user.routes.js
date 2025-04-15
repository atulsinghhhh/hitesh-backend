import {Router} from "express";
import {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateCurrentDetails,updateUserAvatar,updateUserCoverImage,getUserChannelProfile,getWatchHistory} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verfiyjwt } from "../middlewares/auth.middleware.js";


const router=Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:10
        }
    ]),
    registerUser
)
router.route("/login").post(loginUser)

// secure route
router.route("/logout").post(verfiyjwt,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verfiyjwt,changeCurrentPassword)
router.route("/current-user").get(verfiyjwt,getCurrentUser)
router.route("/update-details").patch(verfiyjwt,updateCurrentDetails)
router.route("/avatar").patch(verfiyjwt,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verfiyjwt,upload.single("coverImage"),updateUserCoverImage)
router.route("/c/:username").get(verfiyjwt,getUserChannelProfile)
router.route("/history").get(verfiyjwt,getWatchHistory)

export default router;
// export {router};