const express=require('express');
const multer=require('multer');
const router=express.Router();
const {backup,restore}=require('../controllers/backupController');
const upload = multer({ dest: 'uploads/' }); 


router.get('/',backup);
router.post('/', upload.single('backupFile'),restore);

module.exports=router;