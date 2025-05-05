const express=require('express');
const {createUser,getUsers,loginLocalUsers}=require('../controllers/userController');

const router=express.Router();

router.get('/',getUsers);
router.post('/',createUser);
router.post('/login',loginLocalUsers);

module.exports=router;