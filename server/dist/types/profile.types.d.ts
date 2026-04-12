import { z } from 'zod';
export declare const updateProfileSchema: z.ZodObject<{
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bio: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    department: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    avatarBase64: z.ZodNullable<z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>>;
    rollNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    year: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    section: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    course: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bloodGroup: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    altPhone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    universityRollNo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    university: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    hostelName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    hostelRoom: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    homeAddress: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    employeeId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    designation: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    adminCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    hostelRoom?: string | null | undefined;
    avatarBase64?: string | null | undefined;
    phone?: string | null | undefined;
    bio?: string | null | undefined;
    department?: string | null | undefined;
    rollNumber?: string | null | undefined;
    year?: number | null | undefined;
    section?: string | null | undefined;
    course?: string | null | undefined;
    bloodGroup?: string | null | undefined;
    altPhone?: string | null | undefined;
    universityRollNo?: string | null | undefined;
    university?: string | null | undefined;
    hostelName?: string | null | undefined;
    homeAddress?: string | null | undefined;
    employeeId?: string | null | undefined;
    designation?: string | null | undefined;
    adminCode?: string | null | undefined;
}, {
    hostelRoom?: string | null | undefined;
    avatarBase64?: string | null | undefined;
    phone?: string | null | undefined;
    bio?: string | null | undefined;
    department?: string | null | undefined;
    rollNumber?: string | null | undefined;
    year?: number | null | undefined;
    section?: string | null | undefined;
    course?: string | null | undefined;
    bloodGroup?: string | null | undefined;
    altPhone?: string | null | undefined;
    universityRollNo?: string | null | undefined;
    university?: string | null | undefined;
    hostelName?: string | null | undefined;
    homeAddress?: string | null | undefined;
    employeeId?: string | null | undefined;
    designation?: string | null | undefined;
    adminCode?: string | null | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export declare const updateUserRoleSchema: z.ZodObject<{
    role: z.ZodEnum<["student", "faculty", "admin"]>;
}, "strip", z.ZodTypeAny, {
    role: "faculty" | "student" | "admin";
}, {
    role: "faculty" | "student" | "admin";
}>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export declare const listUsersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    role: z.ZodOptional<z.ZodEnum<["student", "faculty", "admin"]>>;
    search: z.ZodOptional<z.ZodString>;
    year: z.ZodOptional<z.ZodNumber>;
    section: z.ZodOptional<z.ZodString>;
    course: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    search?: string | undefined;
    role?: "faculty" | "student" | "admin" | undefined;
    year?: number | undefined;
    section?: string | undefined;
    course?: string | undefined;
}, {
    search?: string | undefined;
    role?: "faculty" | "student" | "admin" | undefined;
    year?: number | undefined;
    section?: string | undefined;
    course?: string | undefined;
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
//# sourceMappingURL=profile.types.d.ts.map