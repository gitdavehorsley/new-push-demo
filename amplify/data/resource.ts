import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  PhoneNumber: a
    .model({
      phoneNumber: a.string().required(),
      createdAt: a.datetime().required()
    })
    .authorization(allow => [
      allow.guest().to(['create']),
      allow.owner().to(['read', 'update', 'delete'])
    ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30
    }
  }
});
