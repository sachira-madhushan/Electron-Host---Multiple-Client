const express=require('express');
const router=express.Router();
const {getData,setData}=require('../controllers/dataController');

router.get('/',getData);
router.post('/',setData);

module.exports=router;