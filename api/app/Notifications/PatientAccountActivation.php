<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PatientAccountActivation extends Notification
{
    use Queueable;

    public function __construct(private readonly string $token) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/')
            . '/reset-password?token=' . $this->token
            . '&email=' . urlencode($notifiable->getEmailForPasswordReset())
            . '&mode=activate';

        $days = (int) round(config('auth.passwords.activations.expire', 10080) / 1440);

        return (new MailMessage)
            ->subject('Activate your eReseta+ account — DEAMHI')
            ->greeting('Welcome to eReseta+, ' . ($notifiable->name ?? 'there') . '!')
            ->line('A patient account has been created for you at DEAMHI. To activate it, set your own password using the button below.')
            ->action('Set Up My Password', $url)
            ->line("This link is valid for {$days} days and can be used only once.")
            ->line('For your privacy, no one at the hospital knows or can see your password — only you set it.')
            ->line('If you did not expect this, please contact the hospital.');
    }
}
