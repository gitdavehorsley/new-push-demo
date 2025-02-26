import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendSmsFunction } from './function/resource';

const backend = defineBackend({
  auth,
  data,
  sendSmsFunction
});
