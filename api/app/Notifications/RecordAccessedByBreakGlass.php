<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;





class RecordAccessedByBreakGlass extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $doctorName,
        private readonly string $reason,
        private readonly string $accessedAt,
    ) {}


    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Notice: Your medical records were accessed for emergency care — DEAMHI')
            ->greeting('Hello ' . ($notifiable->name ?? 'valued patient') . ',')
            ->line('For your transparency and under the Data Privacy Act (RA 10173), we are notifying you that a physician accessed your medical records using emergency "break-glass" access.')
            ->line('Physician: ' . $this->doctorName)
            ->line('Date & time: ' . $this->accessedAt)
            ->line('Stated reason: "' . $this->reason . '"')
            ->line('Every emergency access is permanently logged and reviewed by our security team. You can review all access to your records anytime in the Privacy & Data Access section of your eReseta+ portal.')
            ->line('If you believe this access was inappropriate, please contact the DEAMHI Data Protection Officer.');
    }
}
