<?php

namespace App\Notifications;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Booking confirmation email sent to the patient when an appointment is created
 * (mentor review 2026-06-18). With MAIL_MAILER=log this is written to the Laravel
 * log; point MAIL_* at a real mailer to deliver for real.
 */
class AppointmentBooked extends Notification
{
    use Queueable;

    public function __construct(private readonly Appointment $appointment) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $when   = $this->appointment->scheduled_at?->format('l, F j, Y \a\t g:i A');
        $doctor = $this->appointment->doctor?->user?->name ?? 'your doctor';

        return (new MailMessage)
            ->subject('Appointment Booked — eReseta+ / DEAMHI')
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . ',')
            ->line('Your appointment request has been received and is pending confirmation.')
            ->line('Doctor: ' . $doctor)
            ->line('Schedule: ' . $when)
            ->line('You will receive an update once your doctor or the clinic confirms it.')
            ->line('Thank you for choosing DEAMHI.');
    }
}
