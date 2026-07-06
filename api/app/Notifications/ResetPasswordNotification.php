<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;






class ResetPasswordNotification extends Notification
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
            . '&email=' . urlencode($notifiable->getEmailForPasswordReset());

        $expire = config('auth.passwords.' . config('auth.defaults.passwords') . '.expire', 60);

        return (new MailMessage)
            ->subject('Reset your eReseta+ password — DEAMHI')
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . ',')
            ->line('We received a request to reset the password for your eReseta+ account.')
            ->action('Reset Password', $url)
            ->line("This link will expire in {$expire} minutes and can be used only once.")
            ->line('If you did not request a password reset, no action is needed — your password will stay the same.');
    }
}
