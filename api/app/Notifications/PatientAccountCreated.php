<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;







class PatientAccountCreated extends Notification
{
    use Queueable;

    public function __construct(private readonly string $tempPassword) {}


    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your eReseta+ Account — DEAMHI')
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . ',')
            ->line('An account has been created for you at DEAMHI so you can access your records, '
                . 'appointments, and e-prescriptions online.')
            ->line('Email: ' . $notifiable->email)
            ->line('Temporary password: ' . $this->tempPassword)
            ->line('For your security, you will be asked to set a new password the first time you log in.')
            ->action('Log in to eReseta+', url('/login'))
            ->line('Thank you for choosing DEAMHI.');
    }
}
