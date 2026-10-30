const Problem = require("../models/problem");
const Submission = require("../models/submission");
const User = require("../models/user");
const {getLanguageById,submitBatch,submitToken} = require("../utils/problemUtility");

const submitCode = async (req,res)=>{
   let submittedResult=null;

    try{
      
       const userId = req.result._id;
       const problemId = req.params.id;

       let {code,language} = req.body;

      if(!userId||!code||!problemId||!language){
        return res.status(400).json({
      message:"Some fields are missing"
    })}
      

      if(language==='cpp')
        language='c++'
      
      console.log(language);
      
    //    Fetch the problem from database
       const problem =  await Problem.findById(problemId);
    //    testcases(Hidden)
    if(!problem)
{
  return res.status(404).json({
    message:"Problem not found"

  });
}    //   Store submission with pending status
    // const submittedResult = await Submission.create({
    //       userId,
    //       problemId,
    //       code,
    //       language,
    //       status:'pending',
    //       testCasesTotal:problem.hiddenTestCases.length
    //  })

    //    Submit code to Judge0
    
    const languageId = getLanguageById(language);
   
    const submissions = problem.hiddenTestCases.map((testcase)=>({
        source_code:code,
        language_id: languageId,
        stdin: testcase.input,
        expected_output: testcase.output
    }));

    
    const submitResult = await submitBatch(submissions);
    
    const resultToken = submitResult.map((value)=> value.token);

    const testResult = await submitToken(resultToken);
    if(
      !Array.isArray(testResult) || testResult.length!==submissions.length || testResult.some(test=>!test || !test.status_id)
    ){
      throw new Error("Judge0 returned an incomplete result");
    }
 submittedResult = await Submission.create({
          userId,
          problemId,
          code,
          language,
          status:'pending',
          testCasesTotal:problem.hiddenTestCases.length
     })
    // Update submittedResult with test results
    let testCasesPassed = 0;
    let runtime = 0;
    let memory = 0;
    let status = 'accepted';
    let errorMessage = null;


    for(const test of testResult){
        if(Number(test.status_id)===3){
           testCasesPassed++;
          //  runtime = runtime+parseFloat(test.time)
          //  memory = Math.max(memory,test.memory);
          runtime+=Number(test.time || 0);
          memory=Math.max(memory, Number(test.memory||0));

        }else{
          // if(test.status_id==4){
          //   status = 'error'
          //   errorMessage = test.stderr
          // }
          if(status==="accepted"){
            status=Number(test.status_id)===4 ? "wrong" : "error";

          }
          // else{
          //   status = 'wrong'
          //   errorMessage = test.stderr
          // }
          errorMessage=test.stderr || test.compile_output || test.message || test.status?.description || "Execution failed";
        }
    }


    // Store the result in Database in Submission
    submittedResult.status   = status;
    submittedResult.testCasesPassed = testCasesPassed;
    submittedResult.errorMessage = errorMessage;
    submittedResult.runtime = runtime;
    submittedResult.memory = memory;

    await submittedResult.save();
    
    // Only mark problem as solved if all tests passed
    // req.result == user Information
    if(status === 'accepted' && !req.result.problemSolved.some(
      (id)=>id.toString()===problemId.toString()
    )){
      // if(!req.result.problemSolved.includes(problemId)){
        req.result.problemSolved.push(problemId);
        await req.result.save();
    //   }
    }
    return res.status(200).json({
      accepted:status==="accepted",
      status,
      totalTestCases: submittedResult.testCasesTotal,
      passedTestCases: testCasesPassed,
      runtime,
      memory,
      errorMessage
    });

    
    // const accepted = (status == 'accepted')
    // res.status(201).json({
    //   accepted,
    //   totalTestCases: submittedResult.testCasesTotal,
    //   passedTestCases: testCasesPassed,
    //   runtime,
    //   memory
    // });
       
    }
    catch(err){
      console.log("Submit Code Error:" , err);
      // if(submittedResult){
      //   submittedResult.status="error";
      //   submittedResult.errorMessage=err.message || "Submission Service Failed";
      //   await submittedResult.save().catch(console.error);
      // }
      return res.status(500).json({
        accepted:false,
        error:"Submission service failed. Your code is preserved please retry"
      });
    }
}


const runCode = async(req,res)=>{
    
     try{
      const userId = req.result._id;
      const problemId = req.params.id;

      let {code,language} = req.body;

     if(!userId||!code||!problemId||!language)
       return res.status(400).send("Some field missing");

   //    Fetch the problem from database
      const problem =  await Problem.findById(problemId);
   //    testcases(Hidden)
      if(language==='cpp')
        language='c++'

   //    Submit code to Judge0
 if(!problem){
  return res.status(404).json({
    message:"Problem not dound"
  })
 }
   const languageId = getLanguageById(language);

   const submissions = problem.visibleTestCases.map((testcase)=>({
       source_code:code,
       language_id: languageId,
       stdin: testcase.input,
       expected_output: testcase.output
   }));


   const submitResult = await submitBatch(submissions);
   
   const resultToken = submitResult.map((value)=> value.token);

   const testResult = await submitToken(resultToken);

    let testCasesPassed = 0;
    let runtime = 0;
    let memory = 0;
    let status = true;
    let errorMessage = null;

    for(const test of testResult){
        if(Number(test.status_id)===3){
           testCasesPassed++;
           runtime+=Number(test.time || 0);
          memory=Math.max(memory, Number(test.memory||0));
        }else{
          status=false;
          errorMessage=test.stderr || test.compile_output || test.message || test.status?.description || "Execution failed";
        }
    }

   
 return res.status(200).json({
      
      success:status,
      testCases:testResult,
      testCasesPassed,

      totalTestCases:problem.visibleTestCases.length,

      runtime,
      memory,
      errorMessage
    });
      
   }
   catch(err){
    console.error("RUn code error",err);
return res.status(500).json({
        success:false,
        error:"Submission service failed. Your code is preserved please retry"
      });
   }

}


module.exports = {submitCode,runCode};