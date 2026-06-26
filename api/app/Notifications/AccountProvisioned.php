<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent when an administrator provisions a staff/clinician/admin account with a
 * system-generated temporary password. The recipient must set a permanent password
 * on first login (must_change_password). With MAIL_MAILER=log this lands in the
 * Laravel log; the provisioning admin also sees the temp password once on screen.
 */
class AccountProvisioned extends Notification
{
    use Queueable;

    public function __construct(private readonly string $tempPassword) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your eReseta+ Account — DEAMHI')
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . ',')
            ->line('An eReseta+ account has been provisioned for you at DEAMHI.')
            ->line('Email: ' . $notifiable->email)
            ->line('Temporary password: ' . $this->tempPassword)
            ->line('For your security, you will be required to set a new password the first time you log in.')
            ->action('Log in to eReseta+', url('/login'))
            ->line('If you were not expecting this, please contact your DEAMHI administrator.');
    }
}
