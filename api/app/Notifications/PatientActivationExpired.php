<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

class PatientActivationExpired extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // Signed link — tamper-proof, no login needed. Clicking it asks staff for a fresh link.
        $url = URL::temporarySignedRoute(
            'activation.renew',
            now()->addDays(30),
            ['user' => $notifiable->getKey()],
        );

        return (new MailMessage)
            ->subject('Your eReseta+ activation link has expired — DEAMHI')
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . ',')
            ->line('The link to activate your eReseta+ patient account has expired before it was used.')
            ->line('Click the button below to ask DEAMHI staff to send you a new activation link.')
            ->action('Request a New Activation Link', $url)
            ->line('If you did not expect this, you can safely ignore this email.');
    }
}
