/*!
     * Copyright 2017-2017 Mutual of Enumclaw. All Rights Reserved.
     * License: Public
*/ 

//Mutual of Enumclaw 
//
//Matthew Hengl and Jocelyn Borovich - 2019 :) :)
//
//Main file that controls remediation and notifications of all NACL User events. 
//Remediates actions when possible or necessary based on launch type and tagging. Then, notifies the user/security. 

//Make sure to that the master.invalid call does NOT have a ! infront of it
//Make sure to delete or comment out the change in the process.env.environtment

// import { EC2 } from 'aws-sdk'
// const ec2 = new EC2();
// import { Master, path } from './Master/MasterClass';
// const master = new Master();
// import * as epsagon from 'epsagon';

const AWS = require('aws-sdk');
const ec2 = new AWS.EC2();
const epsagon = require('epsagon');
const Master = require("aws-automated-master-class/MasterClass").handler;
let path = require("aws-automated-master-class/MasterClass").path;
let master = new Master();

let callRemediate = remediate;

async function handleEvent(event){

  console.log(process.env.run);
  
  let resourceName = 'networkAclId';
  console.log(JSON.stringify(event));
  path.p = 'Path: \nEntered handleEvent';


  event = master.devTest(event);
  //Checks if there is an error in the log
  if (master.errorInLog(event)) {
    console.log(path.p);
    return; 
  }

  //Checks if the log came from this function, quits the program if it does.
  if (master.selfInvoked(event)) {
      console.log(path.p);
      return;
  }

  console.log(`Event action is ${event.detail.eventName}------------------------`);

  if(event.detail.eventName == 'CreateNetworkAcl'){
    resourceName = 'vpcId';
  }
  // if(master.checkKeyUser(event, resourceName)){
    //change this for when you're not testing in snd.
  if(master.invalid(event)){
    try{
        //console.log('Calling remediate');
        await master.notifyUser(event, await callRemediate(event), 'NetworkAcl');
    }
    catch(e){
        console.log(e);
        path.p += '\nERROR';
        console.log(path.p);
        delete path.p;
        return e;
    }
  }
  console.log(path.p);
  delete path.p;
}
async function remediate(event){
  path.p += '\nEntered the remediation function';
  console.log('Entered remediation');
  console.log(event);
  console.log(process.env.run);

  const erp = event.detail.requestParameters;
  const ere = event.detail.responseElements;

  let params = {};
  let results = master.getResults(event, {Resource: erp.networkAclId});

  try{
    switch(results.Action){
      //done
      case 'CreateNetworkAcl':
        path.p += '\nCreateNetworkAcl';
        console.log('CreateNetworkAcl');
        params = { NetworkAclId: ere.networkAcl.networkAclId };
        console.log(params);
        await overrideFunction('deleteNetworkAcl', params);
        results.Resource = params.NetworkAclId;
        results.Response = 'DeleteNetworkAcl';
      break;
      //done
      case 'CreateNetworkAclEntry':
        path.p += '\nCreateNetworkAclEntry';
        params = {
          Egress: erp.egress,
          NetworkAclId: erp.networkAclId,
          RuleNumber: erp.ruleNumber
        };
        await overrideFunction('deleteNetworkAclEntry', params);
        results.Response = 'DeleteNetworkAclEntry';
      break;
      //done
      case 'DeleteNetworkAcl':
        path.p += '\nDeleteNetworkAcl';
        results.Response = 'Remediation could not be performed';
      break;
      //done
      case 'DeleteNetworkAclEntry':
        path.p += '\nDeleteNetworkAclEntry';
        results.Response = 'Remediation could not be performed';
      break;
      //done
      case 'ReplaceNetworkAclAssociation':
        path.p += '\nReplaceNetworkAclAssociation';
        params = {
          AssociationId: erp.associationId,
          NetworkAclId: erp.networkAclId
        };
        await overrideFunction('replaceNetworkAclAssociation', params);
        results.Response = 'ReplaceNetworkAclAssociation';
      break;
      //This function should only be to notify the user/security
      case 'ReplaceNetworkAclEntry':
        path.p += '\nReplaceNetworkAclEntry';
        results.Response = 'Remediation could not be performed';
      break;
    }
  }catch(e){
    console.log(e);
    path.p += '\nERROR';
    return e;
  }
  results.Reason = 'Improper Launch';
  if(results.Response == 'Remediation could not be performed'){
    delete results.Reason;
  }
  path.p += '\nRemediation was finished, notifying user now';
  console.log('returning results');
  return results;
};

async function overrideFunction(apiFunction, params){
  console.log(apiFunction);
  console.log(params);
  if(process.env.run == 'false'){
    epsagon.label('remediate','true');
    await setEc2Function(apiFunction, (params) => {
      console.log(`Overriding ${apiFunction}`);
      return {promise: () => {}};
    });
  }
  await ec2[apiFunction](params).promise();
};

// export function setEc2Function (value, funct){
//     ec2[value] = funct;
// };

// export function setRemediate (funct){
//     callRemediate = funct;
// };

exports.handler = handleEvent;
exports.remediate = remediate;

exports.setEc2Function = (value, funct) => {
  ec2[value] = funct;
};
exports.setOverride = (funct) => {
    callOverride = funct;
};
exports.setRemediate = (funct) => {
  callRemediate = funct;
};