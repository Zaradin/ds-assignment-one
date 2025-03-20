import { marshall } from "@aws-sdk/util-dynamodb";
import { Patient } from "./types";

export const generateMovieItem = (patient: Patient) => {
    return {
        PutRequest: {
            Item: marshall(patient),
        },
    };
};

export const generateBatch = (data: Patient[]) => {
    return data.map((e) => {
        return generateMovieItem(e);
    });
};
