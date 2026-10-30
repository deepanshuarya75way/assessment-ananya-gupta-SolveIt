require("dotenv").config({path:
    require("path").resolve(__dirname,"../../env")
});
const mongoose=require('mongoose');
async function main(){
    console.log("DB URL:", process.env.DB_CONNECT_STRING);
    await mongoose.connect(process.env.DB_CONNECT_STRING);

}
module.exports=main;