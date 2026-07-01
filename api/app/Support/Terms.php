<?php

namespace App\Support;

/**
 * eReseta+ Terms & Privacy agreements (RA 10173). Single source of truth for the version and the
 * role-based text. Bump VERSION whenever the text changes → everyone is forced to re-accept.
 *
 * ⚠️ DEAMHI to fill the real Data Protection Officer + National Privacy Commission contacts
 * (placeholders below) before final submission.
 */
class Terms
{
    public const VERSION = 'v1';

    private const DPO_CONTACT = 'the DEAMHI Data Protection Officer (dpo@deamhi.ph)';
    private const NPC_CONTACT = 'the National Privacy Commission (privacy.gov.ph)';

    /** Map a user role to its agreement variant. */
    public static function variantForRole(?string $role): string
    {
        return match ($role) {
            'patient' => 'patient',
            'admin'   => 'admin',
            default   => 'employee', // doctor, staff, pharmacist
        };
    }

    /**
     * @return array{version:string, variant:string, title:string, intro:string, sections:array<int,array{heading:string, body:string}>}
     */
    public static function for(string $variant): array
    {
        $data = match ($variant) {
            'patient' => self::patient(),
            'admin'   => self::admin(),
            default   => self::employee(),
        };

        return ['version' => self::VERSION, 'variant' => $variant, ...$data];
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
                    'body'    => 'Your medical records are shared securely only within your Circle of Care — your attending doctors, nursing staff, and hospital pharmacists directly involved in your treatment. Non-doctor staff may only view your clinical records after you have given Data Privacy consent, which you can withdraw anytime in your Privacy tab.',
                ],
                [
                    'heading' => '3. Your rights as a data subject',
                    'body'    => 'Under RA 10173 you have the right to be informed, to access and request a copy of your records, to request corrections, to object to or withdraw consent, and to file a complaint. Every access to your records is logged and visible to you.',
                ],
                [
                    'heading' => '4. Security & retention',
                    'body'    => 'Your sensitive information is encrypted and access is role-based and audited. Records are retained per hospital policy and applicable law.',
                ],
                [
                    'heading' => '5. Questions or complaints',
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
                    'heading' => '4. Account security',
                    'body'    => 'You will keep your credentials private, never share your login, and change your temporary password on first use. You are responsible for all activity performed under your account.',
                ],
                [
                    'heading' => '5. Questions',
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
                    'body'    => 'You are bound by the same confidentiality, anti-snooping, and audit-trail terms as all staff — never disclose, never access data outside a legitimate administrative duty, and accept that all your actions are permanently logged.',
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
                    'heading' => '4. Oversight',
                    'body'    => 'Administrator actions are themselves auditable and subject to review. Coordinate data-privacy matters with ' . self::DPO_CONTACT . ' and cooperate with ' . self::NPC_CONTACT . ' as required.',
                ],
            ],
        ];
    }
}
