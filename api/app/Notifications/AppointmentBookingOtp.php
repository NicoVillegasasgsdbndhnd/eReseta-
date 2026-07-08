<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AppointmentBookingOtp extends Notification
{
    use Queueable;

    public function __construct(public readonly string $code) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your eReseta+ appointment verification code')
            ->greeting('Verify your appointment request')
            ->line('Enter this 6-digit code to confirm your appointment booking:')
            ->line('**' . $this->code . '**')
            ->line('The code expires in 10 minutes.')
            ->line('If you did not request an appointment at DEAMHI, you can safely ignore this email.');
    }
}
