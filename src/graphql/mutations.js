/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createPhoneNumber = /* GraphQL */ `
  mutation CreatePhoneNumber(
    $input: CreatePhoneNumberInput!
    $condition: ModelPhoneNumberConditionInput
  ) {
    createPhoneNumber(input: $input, condition: $condition) {
      id
      phoneNumber
      createdAt
      updatedAt
    }
  }
`;

export const updatePhoneNumber = /* GraphQL */ `
  mutation UpdatePhoneNumber(
    $input: UpdatePhoneNumberInput!
    $condition: ModelPhoneNumberConditionInput
  ) {
    updatePhoneNumber(input: $input, condition: $condition) {
      id
      phoneNumber
      createdAt
      updatedAt
    }
  }
`;

export const deletePhoneNumber = /* GraphQL */ `
  mutation DeletePhoneNumber(
    $input: DeletePhoneNumberInput!
    $condition: ModelPhoneNumberConditionInput
  ) {
    deletePhoneNumber(input: $input, condition: $condition) {
      id
      phoneNumber
      createdAt
      updatedAt
    }
  }
`;
