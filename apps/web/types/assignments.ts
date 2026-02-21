// Assignment Types
import { Estate, Division, Company } from './master-data';
import { User } from './user';

export interface UserAssignment {
    id: string;
    userId: string;
    assignedBy: string;
    assignedAt: string;
}

export interface UserEstateAssignment extends UserAssignment {
    estateId: string;
    role: string;
    estate?: Estate;
    user?: User;
}

export interface UserDivisionAssignment extends UserAssignment {
    divisionId: string;
    role: string;
    division?: Division;
    user?: User;
}

export interface UserCompanyAssignment extends UserAssignment {
    companyId: string;
    role: string;
    company?: Company;
    user?: User;
}

export interface UserAssignments {
    estates: UserEstateAssignment[];
    divisions: UserDivisionAssignment[];
    companies: UserCompanyAssignment[];
}

// Input Types
export interface AssignUserToEstateInput {
    userId: string;
    estateId: string;
    role: string;
}

export interface AssignUserToDivisionInput {
    userId: string;
    divisionId: string;
    role: string;
}

export interface AssignUserToCompanyInput {
    userId: string;
    companyId: string;
    role: string;
}
