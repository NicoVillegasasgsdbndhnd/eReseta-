<?php

namespace App\Notifications;

use App\Models\AppointmentRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to a GUEST's email (on-demand, via Notification::route) confirming their
 * appointment request was received, with the reference number to track it. With
 * MAIL_MAILER=log this lands in the Laravel log.
 */
class AppointmentRequestReceived extends Notification
{
    use Queueable;

    public function __construct(private readonly AppointmentRequest $appointmentRequest) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $req    = $this->appointmentRequest;
        $when   = $req->preferred_date?->format('l, F j, Y \a\t g:i A');
        $doctor = $req->doctor?->user?->name ?? 'your preferred doctor';

        return (new MailMessage)
            ->subject('Appointment Request Received — eReseta+ / DEAMHI')
            ->greeting('Hello ' . $req->full_name . ',')
            ->line('We have received your appointment request. The clinic will review it shortly.')
            ->line('Reference No.: ' . $req->reference_no)
            ->line('Doctor: ' . $doctor)
            ->line('Preferred schedule: ' . $when)
            ->line('Please keep your reference number. You will be contacted once it is approved.')
            ->line('Thank you for choosing DEAMHI.');
    }
}
