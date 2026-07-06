<?php

namespace App\Notifications;

use App\Models\AppointmentRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;






class AppointmentRequestApproved extends Notification
{
    use Queueable;

    public function __construct(private readonly AppointmentRequest $appointmentRequest) {}


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
            ->subject('Appointment Confirmed — eReseta+ / DEAMHI')
            ->greeting('Hello ' . $req->full_name . ',')
            ->line('Good news — your appointment request has been approved and scheduled.')
            ->line('Reference No.: ' . $req->reference_no)
            ->line('Doctor: ' . $doctor)
            ->line('Schedule: ' . $when)
            ->line('Please arrive at DEAMHI a few minutes before your scheduled time and bring a valid ID.')
            ->line('Thank you for choosing DEAMHI.');
    }
}
