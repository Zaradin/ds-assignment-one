import { Patient } from "../shared/types";

export const patients: Patient[] = [
    {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1980-05-15",
        gender: "Male",
        lastVisitDate: "2024-02-15",
        patientDiagnosisDescription: "Hypertension, Type 2 Diabetes",
    },
    {
        id: 2,
        firstName: "Alice",
        lastName: "Smith",
        dateOfBirth: "1992-11-23",
        gender: "Female",
        lastVisitDate: "2024-03-10",
        patientDiagnosisDescription: "Asthma, Seasonal allergies",
    },
    {
        id: 3,
        firstName: "James",
        lastName: "Wilson",
        dateOfBirth: "1965-08-30",
        gender: "Male",
        lastVisitDate: "2024-01-20",
        patientDiagnosisDescription: "Coronary artery disease, Hyperlipidemia",
    },
];
