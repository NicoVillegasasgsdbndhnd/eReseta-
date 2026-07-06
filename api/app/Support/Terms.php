<?php

namespace App\Support;









class Terms
{
    public const VERSION = 'v2';

    public const EFFECTIVE_DATE = 'July 2, 2026';

    private const DPO_CONTACT = 'the DEAMHI Data Protection Officer (dpo@deamhi.ph)';
    private const NPC_CONTACT = 'the National Privacy Commission (complaints@privacy.gov.ph, privacy.gov.ph)';


    public static function variantForRole(?string $role): string
    {
        return match ($role) {
            'patient' => 'patient',
            'admin'   => 'admin',
            default   => 'employee', // doctor, staff, pharmacist
        };
    }




    public static function for(string $variant): array
    {
        $data = match ($variant) {
            'patient' => self::patient(),
            'admin'   => self::admin(),
            default   => self::employee(),
        };

        return ['version' => self::VERSION, 'variant' => $variant, 'effective_date' => self::EFFECTIVE_DATE, ...$data];
    }

    private static function patient(): array
    {
        return [
            'title' => 'Patient Privacy & Consent Agreement',
            'intro' => 'Before using eReseta+, please read how Dr. Eutiquio Ll. Atanacio Jr. Memorial Hospital Inc. (DEAMHI) collects and protects your personal and health information under the Data Privacy Act of 2012 (RA 10173).',
            'sections' => [
                [
                    'heading' => '1. What we collect and why',
                    'body'    => 'DEAMHI collects your demographics, contact details, PhilHealth PIN, and medical history strictly to provide you medical treatment and to process your insurance and billing. We collect only what is necessary for your care (data minimization).',
                ],
                [
                    'heading' => '2. Who can see your records (Circle of Care)',
                    'body'    => 'Your medical records are shared securely only within your Circle of Care — your attending doctors, nursing staff, and hospital pharmacists directly involved in your treatment. Non-doctor staff may only view your clinical records after you have given Data Privacy consent, which you can withdraw anytime in your Privacy tab. In a documented emergency, a physician may use "break-glass" access, and you will be notified.',
                ],
                [
                    'heading' => '3. Third-party services we use',
                    'body'    => 'To operate the system we rely on trusted service providers: a secure email service for notifications, a licensed payment processor for billing, and a cloud hosting provider. Prescription lifecycle events are also anchored to a private Hyperledger Fabric blockchain for tamper-evidence — no names, addresses, or PhilHealth numbers are ever stored on-chain. These providers process data only under our instructions and with appropriate safeguards.',
                ],
                [
                    'heading' => '4. How long we keep your data',
                    'body'    => 'Your medical records are retained in accordance with Department of Health and hospital retention policies and applicable law. When no longer required, data is securely disposed of or anonymized.',
                ],
                [
                    'heading' => '5. Your rights as a data subject',
                    'body'    => 'Under RA 10173 you have the right to be informed; to access and obtain a copy of your records; to request corrections; to object to or withdraw consent; to data portability; and to erasure or blocking of your data where allowed by law. Every access to your records is logged and visible to you in your Privacy tab.',
                ],
                [
                    'heading' => '6. Data breach notification',
                    'body'    => 'If a personal data breach likely to seriously harm you occurs, DEAMHI will notify you and the National Privacy Commission as required by RA 10173.',
                ],
                [
                    'heading' => '7. Security',
                    'body'    => 'Your sensitive information is encrypted, access is role-based and fully audited, and all connections are secured over HTTPS.',
                ],
                [
                    'heading' => '8. Changes to these terms',
                    'body'    => 'We may update these terms from time to time. When we do, you will be asked to review and accept the new version on your next login.',
                ],
                [
                    'heading' => '9. Questions or complaints',
                    'body'    => 'You may contact ' . self::DPO_CONTACT . ', or file a complaint with ' . self::NPC_CONTACT . '.',
                ],
            ],
        ];
    }

    private static function employee(): array
    {
        return [
            'title' => 'Employee Confidentiality & Data Security Agreement',
            'intro' => 'As a DEAMHI clinical or administrative user (doctor, staff, or pharmacist), your access to patient data carries legal obligations under the Data Privacy Act of 2012 (RA 10173). By accepting, you agree to the following binding terms.',
            'sections' => [
                [
                    'heading' => '1. Confidentiality (Non-Disclosure)',
                    'body'    => 'You will treat all patient information as strictly confidential. You will never share, print, photograph, export, or leak patient medical data outside the hospital network or to any unauthorized person, during or after your employment.',
                ],
                [
                    'heading' => '2. Access only in the line of duty (Anti-Snooping)',
                    'body'    => 'You may access a patient record ONLY when it is directly required for that patient\'s care or a documented administrative task. Accessing a profile out of curiosity — for example a coworker, relative, or public figure — is strictly prohibited and constitutes a terminal offense: immediate termination and criminal prosecution under RA 10173.',
                ],
                [
                    'heading' => '3. Audit-trail consent',
                    'body'    => 'You acknowledge that 100% of your digital actions — every login, patient search, record view or edit, and every emergency "Break-Glass" override — are permanently recorded against your account and Employee ID and are audited regularly by the security team.',
                ],
                [
                    'heading' => '4. Approved tools only',
                    'body'    => 'You will handle patient data only within eReseta+ and hospital-approved systems. Copying or transferring patient data to personal devices, email, messaging apps, or any unapproved third-party service is prohibited.',
                ],
                [
                    'heading' => '5. Account security',
                    'body'    => 'You will keep your credentials private, never share your login, and change your temporary password on first use. You are responsible for all activity performed under your account.',
                ],
                [
                    'heading' => '6. Changes to this agreement',
                    'body'    => 'DEAMHI may update this agreement. You will be asked to review and re-accept the new version on your next login.',
                ],
                [
                    'heading' => '7. Questions',
                    'body'    => 'Direct data-privacy questions to ' . self::DPO_CONTACT . '.',
                ],
            ],
        ];
    }

    private static function admin(): array
    {
        return [
            'title' => 'System Administrator Agreement',
            'intro' => 'As a DEAMHI system administrator you hold the highest level of access in eReseta+. This carries elevated responsibility and accountability under the Data Privacy Act of 2012 (RA 10173). By accepting, you agree to the following.',
            'sections' => [
                [
                    'heading' => '1. All employee obligations apply',
                    'body'    => 'You are bound by the same confidentiality, anti-snooping, approved-tools, and audit-trail terms as all staff — never disclose, never access data outside a legitimate administrative duty, and accept that all your actions are permanently logged.',
                ],
                [
                    'heading' => '2. Administrative responsibility',
                    'body'    => 'You are accountable for user and role management, security configuration, and the integrity of the audit trail. You will grant access strictly on a need-to-know basis and promptly revoke access that is no longer required.',
                ],
                [
                    'heading' => '3. No abuse of privileged access',
                    'body'    => 'Your elevated ("god-mode") access must never be used to view, alter, or export patient or personnel data for any purpose outside your official administrative duties. Misuse is a terminal offense and prosecutable under RA 10173.',
                ],
                [
                    'heading' => '4. Data Protection Officer function',
                    'body'    => 'Where you also perform the Data Protection Officer (DPO) function, you are responsible for handling data-subject requests, monitoring compliance, and coordinating breach response with ' . self::NPC_CONTACT . '. This function must be carried out independently and free of conflict of interest.',
                ],
                [
                    'heading' => '5. Oversight & changes',
                    'body'    => 'Administrator actions are themselves auditable and subject to review. DEAMHI may update this agreement; you will re-accept the new version on your next login.',
                ],
            ],
        ];
    }
}
