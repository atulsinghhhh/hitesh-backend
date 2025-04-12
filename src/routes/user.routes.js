import {Router} from "express";
import {registerUser,loginUser,logoutUser,refreshAccessToken} from "../controllers/user.controller.js"
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

export default router;
// export {router};