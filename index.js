const port = 8000;
const express = require("express")
const app = express()
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const multer = require("multer")
const path = require("path")
const cors = require("cors");


app.use(express.json())
app.use(cors())

// Database connection with MongoDB
mongoose.connect("mongodb+srv://kalai6464:kalai6464@cluster0.suros08.mongodb.net/e-commerce")

//API Creation
app.get("/",(req,res)=>{
    res.send("Express App is Running")
})

//Image Storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.filename}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})


//Creating Upload Endpoint for images

app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`https://backend-knm3.onrender.com/images/${req.file.filename}`
    })
})

//Schema for creating products

const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({})
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1)
        let last_product = last_product_array[0]
        id = last_product.id+1
    }
    else{
        id=1
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price
    })
    console.log(product)
    await product.save()
    console.log("Saved")
    res.json({
        success:true,
        name:req.body.name,
    })
})

// Creating API for deleting products

app.post('/removeproduct',async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id})
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name
    })
})

// Creating API for getting all products

app.get('/allproducts',async (req,res)=>{
    let products = await Product.find({})
    console.log("All Products Fetched")
    res.send(products)
})


// Schema creating for User model
const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    mobile:{
        type:String,
        unique:true
    },
    address:{
        type:String,
    },
    role:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    
})

// Creating Endpoint for registering the user
app.post('/signup',async (req,res)=>{

    let check = await Users.findOne({email:req.body.email})
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with same email address"})

    }
    let cart = {}
    for(let i=0;i<300;i++){
        cart[i]=0
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        role:req.body.role,
        address:req.body.address,
        password:req.body.password,
        mobile: req.body.mobile,
        cartData:cart,
    })
    await user.save()
    const data = {
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(data,'secret_ecom')
    res.json({success:true,token})
})

// creating endpoint for user login
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email})
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id,
                    role:user.role
                }
            }
            const token = jwt.sign(data,'secret_ecom')
            res.json({success:true,token, role:user.role})
        }
        else{
            res.json({success:false,errors:"Wrong Password"})
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Id"})
    }
})


// creating endpoint for newcollection data
app.get('/newcollections',async(req,res)=>{
    let products = await Product.find({})
    let newcollection = products.slice(1).slice(-8)
    console.log("New Collection Fetched");
    res.send(newcollection)
})

// creating endpoint for popular in women section
app.get('/latestlaptops',async(req,res)=>{
    let products = await Product.find({category:"laptop"})
    let popular_in_women = products.slice(0,4)
    console.log("Popular laptops fetched");
    res.send(popular_in_women)
})

// creating middelware to fetch user
const fetchUser = async(req,res,next)=>{
    const token = req.header('auth-token')
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})

    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom')
            req.user = data.user
            next()
        } catch (error) {
            res.status(401).send({errors:"please authenticate valid token"})
        }
    }
}


// creating endpoint for adding products in cartdata
app.post('/addtocart',fetchUser,async(req,res)=>{
    console.log("Added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id})
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Added")
})

// creating endpoint for remove product from cartdata
app.post('/removefromcart', fetchUser, async (req, res) => {
    try {
        let userData = await Users.findOne({ _id: req.user.id })
        if (userData.cartData[req.body.itemId] > 0) {
            userData.cartData[req.body.itemId] -= 1
            await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData })
            res.json({ success: true, message: "Item removed from cart" })
        } else {
            res.status(400).json({ success: false, message: "Item not found in cart" })
        }
    } catch (error) {
        console.error("Error removing item from cart:", error)
        res.status(500).json({ success: false, message: "Failed to remove item from cart" })
    }
})


// creating endpoint to get cartdata
app.post('/getcart',fetchUser,async(req,res)=>{
    console.log('GetCart')
    let userData = await Users.findOne({_id:req.user.id})
    res.json(userData.cartData)
})

// Fetch the user details
app.get('/userdetails', fetchUser, async (req, res) => {
    try {
        const user = await Users.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        res.json({ success: true, user: user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Server error" });
    }
})


 
  // Add this route handler in your Express server

app.post('/clearcart', fetchUser, async (req, res) => {
    try {
        // Find the user based on the user ID stored in req.user.id
        const user = await Users.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Clear the cart data
        user.cartData = getDefaultCart();
        await user.save();

        res.json({ success: true, message: "Cart cleared successfully" });
    } catch (error) {
        console.error("Error clearing cart:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
})

// Add this route handler in your Express server to fetch a single product by ID
app.get('/product/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findOne({ id: productId });
        
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json(product);
    } catch (error) {
        console.error("Error retrieving product:", error);
        res.status(500).json({ success: false, message: "Failed to retrieve product" });
    }
})

// Add this route handler to update a product
app.put('/updateproduct/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const { name, new_price, old_price } = req.body;

        // Find the product by ID and update it
        const product = await Product.findOneAndUpdate(
            { id: productId },
            { name, new_price, old_price },
            { new: true }
        );
        
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        res.json({ success: true, product });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ success: false, message: "Failed to update product" });
    }
})

  

app.listen(port,(error)=>{
    if (!error) {
        console.log("Server Running on port "+port);
    }
    else{
        console.log("Err "+error)
    }
})
