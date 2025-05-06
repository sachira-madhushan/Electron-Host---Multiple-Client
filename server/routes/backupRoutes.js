const express=require('express');
const multer=require('multer');
const router=express.Router();
const {backup,restore}=require('../controllers/backupController');
const path=require('path');
const os=require('os');

const uploadDir = path.join(os.homedir(), 'Documents', 'CrudPWAAPP');

const upload = multer({ dest: uploadDir }); 


router.get('/',backup);
router.post('/', upload.single('backupFile'),restore);

module.exports=router;