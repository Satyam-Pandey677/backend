import { Router } from "express";
import { currentPasswordChange, getCurrentUser, getUserChannelprofile, getWatchHistory, loginUser, logOutUser, refreshAccessToken, registerUser, updateAccountAvatar, updateAccountCoverImage, UpdateAccountUser } from "../controllers/user.controller.js";
import {upload} from "../middleware/multer.js"
import { verifyJWT } from "../middleware/auth.middleware.js";
// import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser) 

router.route()


//secured Route
router.route("/logout").post(verifyJWT, logOutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT,currentPasswordChange)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/update-account").patch(verifyJWT,UpdateAccountUser)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"), updateAccountAvatar)

router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateAccountCoverImage)

router.route("/channel/:username").get(verifyJWT,getUserChannelprofile)

router.route("/history").get(verifyJWT,getWatchHistory)


export default router